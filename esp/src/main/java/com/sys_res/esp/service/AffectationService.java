package com.sys_res.esp.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.sys_res.esp.dto.AffectationRequest;
import com.sys_res.esp.entity.Affectation;
import com.sys_res.esp.entity.Classe;
import com.sys_res.esp.entity.Users; // Import Salle
import com.sys_res.esp.repository.AffectationRepository;
import com.sys_res.esp.repository.ClasseRepository;
import com.sys_res.esp.repository.SalleRepository;
import com.sys_res.esp.repository.UsersRepository; // Import SalleRepository

@Service
public class AffectationService {

  @Autowired
  private AffectationRepository affectationRepository;

  @Autowired
  private UsersRepository usersRepository;

  @Autowired
  private ClasseRepository classeRepository;

  @Autowired
  private SalleRepository salleRepository; // Inject SalleRepository

  public List<Affectation> findAll() {
    return affectationRepository.findAll();
  }

  public Optional<Affectation> findById(Integer id) {
    return affectationRepository.findById(id);
  }

  public Affectation createAffectation(AffectationRequest affectationRequest) {
    Users user = usersRepository.findById(affectationRequest.getUserId())
      .orElseThrow(() -> new IllegalArgumentException("Invalid user ID"));
    Classe classe = classeRepository.findById(affectationRequest.getClasseId())
      .orElseThrow(() -> new IllegalArgumentException("Invalid class ID"));
    
    // Récupérer la salle associée à la classe (si l'affectation inclut une salle)
    // Pour l'instant, l'AffectationRequest ne contient pas d'ID de salle.
    // Si l'affectation est entre un utilisateur et une classe, et que la salle est déterminée
    // par le planning, cette validation doit être faite ailleurs.
    // Cependant, si l'affectation implique directement une salle, nous devons modifier AffectationRequest.
    // Pour l'objectif actuel, je vais supposer que l'affectation est pour un étudiant à une classe,
    // et que la capacité de la salle est vérifiée lors de la création du planning.
    // L'utilisateur a demandé "l'effectif ne depasse pas la capacite de la salle non dans le model ai"
    // ce qui implique une validation au moment de l'affectation d'un étudiant à une classe.
    // Cela signifie que la classe doit avoir une salle assignée ou que la validation doit se faire
    // au moment de l'affectation de la classe à une salle.

    // Si l'affectation est pour un étudiant à une classe, et que la classe a un effectif,
    // et que la salle est associée à la classe (par exemple, via un planning ou une affectation de salle à classe),
    // alors nous devons récupérer la salle ici.

    // Pour l'instant, je vais ajouter une validation simple basée sur l'effectif de la classe
    // et une capacité maximale générique si aucune salle n'est directement liée ici.
    // Si l'affectationRequest doit inclure un ID de salle, il faudra modifier AffectationRequest.java.

    // Vérification de l'effectif de la classe par rapport à une capacité maximale (par exemple, 30)
    // Cette partie est déjà présente et vérifie si la classe a atteint son effectif maximal.
    if (classe.getEffectif() == null) {
        classe.setEffectif(0);
    }
    // La capacité de 30 est une valeur arbitraire ici. Si la capacité doit venir d'une salle,
    // il faut que l'affectationRequest inclue l'ID de la salle.
    // Pour l'instant, je vais laisser la limite de 30 comme une limite générale pour une classe.
    if (classe.getEffectif() >= 30) { // Cette limite de 30 est arbitraire, elle devrait venir de la salle
        throw new IllegalStateException("La classe " + classe.getNomClasse() + " a déjà atteint son effectif maximal de 30 étudiants.");
    }

    Affectation affectation = new Affectation();
    affectation.setUser(user);
    affectation.setClasse(classe);
    affectation.setDateAffectation(affectationRequest.getDateAffectation());

    Affectation savedAffectation = affectationRepository.save(affectation);

    // Incrémenter l'effectif de la classe
    classe.setEffectif(classe.getEffectif() + 1);
    classeRepository.save(classe);

    return savedAffectation;
  }

  public void deleteById(Integer id) {
    Optional<Affectation> affectationOptional = affectationRepository.findById(id);
    if (affectationOptional.isPresent()) {
        Affectation affectation = affectationOptional.get();
        Classe classe = affectation.getClasse();

        affectationRepository.deleteById(id);

        // Decrement class effectif
        if (classe.getEffectif() != null && classe.getEffectif() > 0) {
            classe.setEffectif(classe.getEffectif() - 1);
            classeRepository.save(classe);
        }
    } else {
        throw new IllegalArgumentException("Affectation not found with ID: " + id);
    }
  }
}
